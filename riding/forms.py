from django import forms


class MapForm(forms.Form):
    TIME_CHOICES = [(f"{hour:02d}:00", f"{hour:02d} : 00") for hour in range(9, 24)]

    selected_time = forms.ChoiceField(
        choices=TIME_CHOICES,
        required=False,
        widget=forms.Select(
            attrs={"class": "time-item", "data-mobile": "true"}  # 모바일 최적화 표시
        ),
    )

    class Media:
        css = {"all": ("riding/css/map.css",)}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["selected_time"].widget.attrs.update(
            {
                "onchange": "this.form.submit();",  # 시간 선택 시 자동 제출
                "data-touch-action": "manipulation",  # 모바일 터치 최적화
            }
        )
